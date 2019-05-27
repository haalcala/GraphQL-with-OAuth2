import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";

@Entity("RefreshTokens")
export class RefreshToken extends BaseEntity {
	@ObjectIdColumn()
	id: ObjectID;

	@Column("text")
	token: string;

	@Column("text")
	userId: string;

	@Column("text")
	clientId: string;

	@Column("text")
	sessionId: string;

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;

	@Column()
	sessionId: string;
}
